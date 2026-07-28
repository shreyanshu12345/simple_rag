import time

def calculate(logs):
    llm_calc = {"total_token": 0, "total_wait_time": 0}
    retrival = {"total_wait_time": 0}

    for req_id in logs:
        for evals in logs[req_id]:
            if(evals["name"] == "retrieval"):
                retrival["total_wait_time"] += evals["duration"]
            else:
                llm_calc["total_token"] += evals.get("tokens", 0)
                llm_calc["total_wait_time"] += evals["duration"]

    print()
    print("llm_calc : ", llm_calc)
    print("retrival : ", retrival)
    print()



class spanTracing():
    all_logs = {}
    def __init__(self, name, id):
        self.__cost = {"start_time": None, "end_time": None, "duration": None}
        self.name = name
        self.req_id = id

    #def set_token(self, tokens):
        #self.__cost["tokens"] = tokens

    def __enter__(self):
        self.__cost["start_time"] = time.time()
        return self

    def log(self):
        # print("****** logging ********")
        # print("******* ", self.name, " ********")

        # for i in self.__cost:
        #     if(self.__cost[i] is not None):
        #         print(i, " : ", self.__cost[i])
        if(self.req_id in spanTracing.all_logs):
           spanTracing.all_logs[self.req_id].append(self.__cost.copy())
        else:
           spanTracing.all_logs[self.req_id] = [self.__cost.copy()]
        print(spanTracing.all_logs)

    #def set_k(self, k):
       # self.__cost["k"] = k

    def set_metadata(self, key, value):
        self.__cost[key] = value

    def __exit__(self, *args):
        self.__cost["end_time"] = time.time()
        self.__cost["duration"] = self.__cost["end_time"] - self.__cost["start_time"]
        self.__cost["name"] = self.name
        self.log()
        calculate(spanTracing.all_logs)
        pass





if(__name__ == "__main__"):
    with spanTracing("retrival") as span:
        time.sleep(1)
        print("tracing....")
