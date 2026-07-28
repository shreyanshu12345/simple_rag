import time

def calculate(logs):
    llm_tokens, llm_wait_times, retrieval_wait_times = [], [], []

    for req_id in logs:
        for evals in logs[req_id]:
            if evals["name"] == "retrieval":
                retrieval_wait_times.append(evals["duration"])
            else:
                llm_wait_times.append(evals["duration"])
                if "tokens" in evals:
                    llm_tokens.append(evals["tokens"])

    llm_avg = {
        "avg_tokens": sum(llm_tokens) / len(llm_tokens) if llm_tokens else 0,
        "avg_wait_time": sum(llm_wait_times) / len(llm_wait_times) if llm_wait_times else 0,
    }
    retrieval_avg = {
        "avg_wait_time": sum(retrieval_wait_times) / len(retrieval_wait_times) if retrieval_wait_times else 0,
    }

    print()
    print("llm_avg     : ", llm_avg)
    print("retrival_avg: ", retrieval_avg)
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
        print("****** logging ********")
        print("******* ", self.name, " ********")

        for i in self.__cost:
            if(self.__cost[i] is not None):
                print(i, " : ", self.__cost[i])
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
        # calculate(spanTracing.all_logs)
        pass





if(__name__ == "__main__"):
    with spanTracing("retrival") as span:
        time.sleep(1)
        print("tracing....")
